import { t } from '@lingui/macro';
import { Grid, LoadingOverlay, Skeleton, Stack } from '@mantine/core';
import {
  IconCurrencyDollar,
  IconDots,
  IconInfoCircle,
  IconPackages,
  IconShoppingCart
} from '@tabler/icons-react';
import { useMemo } from 'react';
import { useParams } from 'react-router-dom';

import { DetailsField, DetailsTable } from '../../components/details/Details';
import { DetailsImage } from '../../components/details/DetailsImage';
import { ItemDetailsGrid } from '../../components/details/ItemDetails';
import {
  ActionDropdown,
  DeleteItemAction,
  DuplicateItemAction,
  EditItemAction
} from '../../components/items/ActionDropdown';
import { PageDetail } from '../../components/nav/PageDetail';
import { PanelGroup, PanelType } from '../../components/nav/PanelGroup';
import { ApiEndpoints } from '../../enums/ApiEndpoints';
import { ModelType } from '../../enums/ModelType';
import { UserRoles } from '../../enums/Roles';
import { useSupplierPartFields } from '../../forms/CompanyForms';
import { useEditApiFormModal } from '../../hooks/UseForm';
import { useInstance } from '../../hooks/UseInstance';
import { apiUrl } from '../../states/ApiState';
import { useUserState } from '../../states/UserState';
import { PurchaseOrderTable } from '../../tables/purchasing/PurchaseOrderTable';

export default function SupplierPartDetail() {
  const { id } = useParams();

  const user = useUserState();

  const {
    instance: supplierPart,
    instanceQuery,
    refreshInstance
  } = useInstance({
    endpoint: ApiEndpoints.supplier_part_list,
    pk: id,
    hasPrimaryKey: true,
    params: {
      part_detail: true,
      supplier_detail: true
    }
  });

  const detailsPanel = useMemo(() => {
    if (instanceQuery.isFetching) {
      return <Skeleton />;
    }

    let data = supplierPart ?? {};

    // Access nested data
    data.manufacturer = data.manufacturer_detail?.pk;
    data.MPN = data.manufacturer_part_detail?.MPN;
    data.manufacturer_part = data.manufacturer_part_detail?.pk;

    let tl: DetailsField[] = [
      {
        type: 'link',
        name: 'part',
        label: t`Internal Part`,
        model: ModelType.part,
        hidden: !supplierPart.part
      },
      {
        type: 'string',
        name: 'description',
        label: t`Description`,
        copy: true
      },
      {
        type: 'link',
        external: true,
        name: 'link',
        label: t`External Link`,
        copy: true,
        hidden: !supplierPart.link
      },
      {
        type: 'string',
        name: 'note',
        label: t`Note`,
        copy: true,
        hidden: !supplierPart.note
      }
    ];

    let tr: DetailsField[] = [
      {
        type: 'link',
        name: 'supplier',
        label: t`Supplier`,
        model: ModelType.company,
        icon: 'suppliers',
        hidden: !supplierPart.supplier
      },
      {
        type: 'string',
        name: 'SKU',
        label: t`SKU`,
        copy: true,
        icon: 'reference'
      },
      {
        type: 'link',
        name: 'manufacturer',
        label: t`Manufacturer`,
        model: ModelType.company,
        icon: 'manufacturers',
        hidden: !data.manufacturer
      },
      {
        type: 'link',
        name: 'manufacturer_part',
        model_field: 'MPN',
        label: t`Manufacturer Part Number`,
        model: ModelType.manufacturerpart,
        copy: true,
        icon: 'reference',
        hidden: !data.manufacturer_part
      }
    ];

    let bl: DetailsField[] = [
      {
        type: 'string',
        name: 'packaging',
        label: t`Packaging`,
        copy: true,
        hidden: !data.packaging
      },
      {
        type: 'string',
        name: 'pack_quantity',
        label: t`Pack Quantity`,
        copy: true,
        hidden: !data.pack_quantity,
        icon: 'packages'
      }
    ];

    let br: DetailsField[] = [
      {
        type: 'string',
        name: 'available',
        label: t`Supplier Availability`,
        copy: true,
        icon: 'packages'
      },
      {
        type: 'string',
        name: 'availability_updated',
        label: t`Availability Updated`,
        copy: true,
        hidden: !data.availability_updated,
        icon: 'calendar'
      }
    ];

    return (
      <ItemDetailsGrid>
        <Grid>
          <Grid.Col span={4}>
            <DetailsImage
              appRole={UserRoles.part}
              src={supplierPart?.part_detail?.image}
              apiPath={apiUrl(
                ApiEndpoints.part_list,
                supplierPart?.part_detail?.pk
              )}
              pk={supplierPart?.part_detail?.pk}
            />
          </Grid.Col>
          <Grid.Col span={8}>
            <DetailsTable title={t`Supplier Part`} fields={tl} item={data} />
          </Grid.Col>
        </Grid>
        <DetailsTable title={t`Supplier`} fields={tr} item={data} />
        <DetailsTable title={t`Packaging`} fields={bl} item={data} />
        <DetailsTable title={t`Availability`} fields={br} item={data} />
      </ItemDetailsGrid>
    );
  }, [supplierPart, instanceQuery.isFetching]);

  const panels: PanelType[] = useMemo(() => {
    return [
      {
        name: 'details',
        label: t`Supplier Part Details`,
        icon: <IconInfoCircle />,
        content: detailsPanel
      },
      {
        name: 'stock',
        label: t`Received Stock`,
        icon: <IconPackages />
      },
      {
        name: 'purchaseorders',
        label: t`Purchase Orders`,
        icon: <IconShoppingCart />,
        content: supplierPart?.pk ? (
          <PurchaseOrderTable supplierPartId={supplierPart.pk} />
        ) : (
          <Skeleton />
        )
      },
      {
        name: 'pricing',
        label: t`Pricing`,
        icon: <IconCurrencyDollar />
      }
    ];
  }, [supplierPart]);

  const supplierPartActions = useMemo(() => {
    return [
      <ActionDropdown
        key="part"
        tooltip={t`Supplier Part Actions`}
        icon={<IconDots />}
        actions={[
          DuplicateItemAction({
            hidden: !user.hasAddRole(UserRoles.purchase_order)
          }),
          EditItemAction({
            hidden: !user.hasChangeRole(UserRoles.purchase_order),
            onClick: () => editSuppliertPart.open()
          }),
          DeleteItemAction({
            hidden: !user.hasDeleteRole(UserRoles.purchase_order)
          })
        ]}
      />
    ];
  }, [user]);

  const editSupplierPartFields = useSupplierPartFields({
    hidePart: true,
    partPk: supplierPart?.pk
  });

  const editSuppliertPart = useEditApiFormModal({
    url: ApiEndpoints.supplier_part_list,
    pk: supplierPart?.pk,
    title: t`Edit Supplier Part`,
    fields: editSupplierPartFields,
    onFormSuccess: refreshInstance
  });

  const breadcrumbs = useMemo(() => {
    return [
      {
        name: t`Purchasing`,
        url: '/purchasing/'
      },
      {
        name: supplierPart?.supplier_detail?.name ?? t`Supplier`,
        url: `/purchasing/supplier/${supplierPart?.supplier_detail?.pk ?? ''}`
      }
    ];
  }, [supplierPart]);

  return (
    <>
      {editSuppliertPart.modal}
      <Stack spacing="xs">
        <LoadingOverlay visible={instanceQuery.isFetching} />
        <PageDetail
          title={t`Supplier Part`}
          subtitle={`${supplierPart.SKU} - ${supplierPart?.part_detail?.name}`}
          breadcrumbs={breadcrumbs}
          actions={supplierPartActions}
          imageUrl={supplierPart?.part_detail?.thumbnail}
        />
        <PanelGroup pageKey="supplierpart" panels={panels} />
      </Stack>
    </>
  );
}
