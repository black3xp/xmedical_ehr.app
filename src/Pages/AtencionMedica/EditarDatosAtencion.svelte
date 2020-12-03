<script>
    import { link } from "svelte-spa-router";
    import Header from "../../Layout/Header.svelte";
    import AsideAtencion from "../../Layout/AsideAtencion.svelte";
    import ModalDatosPaciente from "../../componentes/ModalDatosPaciente.svelte";
</script>

<AsideAtencion />
<div class="contenedor-datos" id="divHeaderBar">
    <div class="row">
        <div class="col-md-6">
            <h5>
                <span class="badge badge-primary" data-bind="text: titulo">Atención Ambulatoria</span>
                <span data-bind="text: paciente().nombreParaMostrar">Fiordaliza De Jesus Herrera</span>
            </h5>
        </div>
        <div class="col-md-6" style="text-align: right;">
            <div class="guardar-documento">
                <div class="guardando mr-2 text-success" data-bind="html: content, class: contentClass"><i
                        class="mdi mdi-check-all"></i> <i>listo y guardado</i></div>
            </div>
        </div>
        <div class="col-lg-12">
            <div class="dropdown" data-bind="foreach: actionButtons">
                    <button data-toggle="modal" data-target="#modalDatosPersonales" style="box-shadow:none;"
                        class="btn btn-outline-secondary btn-sm">
                        <i data-bind="class: icon" class="mdi mdi-comment-eye"></i>
                        <sapn data-bind="text: text">Datos del Paciente</sapn>
                    </button>
                    <button data-bind=" class: itemClass,click: clickEvent" style="box-shadow:none;"
                        class="btn btn-outline-danger btn-sm">
                        <i data-bind="class: icon" class="mdi mdi-delete"></i>
                        <sapn data-bind="text: text">Anular</sapn>
                    </button>
                    <button data-bind=" class: itemClass,click: clickEvent" style="box-shadow:none;"
                        class="btn btn-outline-success btn-sm">
                        <i data-bind="class: icon" class="mdi mdi-checkbox-blank"></i>
                        <sapn data-bind="text: text">Cerrar Atencion</sapn>
                    </button>
            </div>
        </div>
    </div>
</div>

    <Header />
    <main class="admin-main">
        <div class="col-lg-12" style="margin-top: 120px;">
            <div class="card m-b-30" data-bind="using: atencionMedica">
                <div class="card-header">
                    <h5 class="m-b-0">
                        Datos de la Atención
                    </h5>
    
                </div>
                <div class="card-body">
                    <form action="">
                        <div class="form-row">
                            <div class="col-md-3 form-group">
                                <label for="">Fecha de Ingreso</label>
                                <input type="date" data-bind="value: fecha" class="form-control autosave">
                            </div>
                            <div class="col-md-3 form-group">
                                <label for="">Hora de Ingreso</label>
                                <input type="time" data-bind="value: hora" class="form-control autosave">
                            </div>
                            <div class="col-md-3 form-group">
                                <label for="">Edad del Paciente</label>
                                <input data-bind="value: edadPaciente" type="text" class="form-control autosave">
                            </div>
                        </div><br>
                        <div class="form-row">
                            <div class="form-group col-md-3">
                                <label for="" class="font-secondary">Médico de Cabecera</label>
                                <select class="form-control" id="sltMedico" style="width: 100%;" tabindex="-1" aria-hidden="true" required="" data-select2-id="sltMedico">
                                    <option value="" data-select2-id="635">- Seleccionar Medico -</option>
                                    <option value="2" data-select2-id="636">Alfredo Joel Mena</option>
                                    <option value="3" data-select2-id="637">Vladimir Núñez</option>
                                    <option value="5" data-select2-id="638">Verenice Gálvez</option>
                                    <option value="8" data-select2-id="639">stephany maria nuñez moya</option>
                                    <option value="9" data-select2-id="640">Pedro  Compres</option>
                                    <option value="10" data-select2-id="641">Milagros Sierra</option>
                                    <option value="11" data-select2-id="642">Marlena Taveras</option>
                                    <option value="12" data-select2-id="643">Mariela Camilo</option>
                                    <option value="13" data-select2-id="644">Emely Bidó García</option>
                                </select>
                            </div>
                            <div class="form-group col-md-3">
                                <label for="" class="font-secondary">Aseguradora</label>
                                <select class="form-control" id="sltAseguradora" style="width: 100%;" tabindex="-1" aria-hidden="true" required="" data-select2-id="sltAseguradora">
                                    <option value="" data-select2-id="647">- Seleccionar Seguros -</option>
                                    <option value="3" data-select2-id="648">ARS C.M.D</option>
                                    <option value="4" data-select2-id="649">ARS UNIVERSAL</option>
                                    <option value="5" data-select2-id="650">ARS COLONIAL</option>
                                    <option value="6" data-select2-id="651">ARS MONUMENTAL</option>
                                    <option value="7" data-select2-id="652">ARS CONSTITUCION</option>
                                </select>
                            </div>
                            <div class="form-group col-md-3">
                                <label for="" class="font-secondary">Cama</label>
                                <select class="form-control" id="sltAseguradora" style="width: 100%;" tabindex="-1" aria-hidden="true" required="" data-select2-id="sltAseguradora">
                                    <option value="" data-select2-id="647">- Seleccionar Cama -</option>
                                    <option value="3" data-select2-id="648">Cama 1</option>
                                </select>
                            </div>
                        </div>
                    </form>
                </div>
            </div>
        </div>

        <div class="col-lg-12" style="margin-top: 20px;">
            <div class="card m-b-30" data-bind="using: atencionMedica">
                <div class="card-header">
                    <h5 class="m-b-0">
                        Contacto financiero
                    </h5>
    
                </div>
                <div class="card-body">
                    <form action="">
                        <div class="form-row">
                            <div class="form-group col-md-3">
                                <label for="" class="font-secondary">Nombre</label>
                                <input type="text" class="form-control">
                            </div>
                            <div class="form-group col-md-3">
                                <label for="" class="font-secondary">Tipo de financiamiento</label>
                                <select class="form-control" id="sltAseguradora" style="width: 100%;" tabindex="-1" aria-hidden="true" required="" data-select2-id="sltAseguradora">
                                    <option value="" data-select2-id="647">- Seleccionar tipo -</option>
                                    <option value="3" data-select2-id="648">Efectivo</option>
                                </select>
                            </div>
                        </div>
                    </form>
                </div>
            </div>
    
        </div>

    </main>

<ModalDatosPaciente/>